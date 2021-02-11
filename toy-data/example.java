class BST { ...
  private BST left, right;
  protected int data;
  public void insert(int v) {
    if (v<data)
      if (left!=null) left.insert(v);
      else left = makeNode(v);
    else if(v>data)
      if (right!=null) right.insert(v);
      else right = makeNode(v);
}
... 
}
class DupTree extends BST {
  private int count;
  public void insert(int v) {
    if (v==data) count++;
    else super.insert(v);
  }
... 
}